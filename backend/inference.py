"""CPU OpenPOM inference using the upstream 10-model checkpoint architecture."""
import json, os, hashlib
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
import numpy as np
from catalog import CATALOG

TASKS = ['alcoholic','aldehydic','alliaceous','almond','amber','animal','anisic','apple','apricot','aromatic','balsamic','banana','beefy','bergamot','berry','bitter','black currant','brandy','burnt','buttery','cabbage','camphoreous','caramellic','cedar','celery','chamomile','cheesy','cherry','chocolate','cinnamon','citrus','clean','clove','cocoa','coconut','coffee','cognac','cooked','cooling','cortex','coumarinic','creamy','cucumber','dairy','dry','earthy','ethereal','fatty','fermented','fishy','floral','fresh','fruit skin','fruity','garlic','gassy','geranium','grape','grapefruit','grassy','green','hawthorn','hay','hazelnut','herbal','honey','hyacinth','jasmin','juicy','ketonic','lactonic','lavender','leafy','leathery','lemon','lily','malty','meaty','medicinal','melon','metallic','milky','mint','muguet','mushroom','musk','musty','natural','nutty','odorless','oily','onion','orange','orangeflower','orris','ozone','peach','pear','phenolic','pine','pineapple','plum','popcorn','potato','powdery','pungent','radish','raspberry','ripe','roasted','rose','rummy','sandalwood','savory','sharp','smoky','soapy','solvent','sour','spicy','strawberry','sulfurous','sweaty','sweet','tea','terpenic','tobacco','tomato','tropical','vanilla','vegetable','vetiver','violet','warm','waxy','weedy','winey','woody']
BASE=Path(__file__).resolve().parent

def load_model(path):
    from openpom.models.mpnn_pom import MPNNPOMModel
    from openpom.feat.graph_featurizer import GraphConvConstants
    model=MPNNPOMModel(n_tasks=len(TASKS),batch_size=128,class_imbalance_ratio=None,loss_aggr_type='sum',node_out_feats=100,edge_hidden_feats=75,edge_out_feats=100,num_step_message_passing=5,mpnn_residual=True,message_aggregator_type='sum',mode='classification',number_atom_features=GraphConvConstants.ATOM_FDIM,number_bond_features=GraphConvConstants.BOND_FDIM,n_classes=1,readout_type='set2set',num_step_set2set=3,num_layer_set2set=2,ffn_hidden_list=[392,392],ffn_embeddings=256,ffn_activation='relu',ffn_dropout_p=0.12,ffn_dropout_at_input_no_act=False,weight_decay=1e-5,self_loop=False,optimizer_name='adam',log_frequency=32,model_dir=str(path.parent),device_name='cpu')
    model.restore(str(path))
    return model

def build_cache():
    import torch, deepchem as dc
    from rdkit import Chem
    from rdkit.Chem import Draw
    from openpom.feat.graph_featurizer import GraphFeaturizer
    torch.set_num_threads(2)
    molecules=[]
    target=BASE.parent/'dist'/'assets'/'molecules';target.mkdir(parents=True,exist_ok=True)
    for row in CATALOG:
        mol=Chem.MolFromSmiles(row['smiles'])
        if mol is None: raise ValueError(f"Invalid SMILES: {row['id']}")
        row=dict(row,smiles=Chem.MolToSmiles(mol))
        svg=Draw.MolsToGridImage([mol],molsPerRow=1,subImgSize=(300,180),useSVG=True)
        (target/f"{row['id']}.svg").write_text(svg)
        molecules.append(row)
    ds=dc.data.NumpyDataset(GraphFeaturizer().featurize([r['smiles'] for r in molecules]))
    all_preds=[];checks=[]
    paths=sorted((BASE/'models').glob('experiments_*/checkpoint2.pt'),key=lambda p:int(p.parent.name.split('_')[-1]))
    if not paths: raise RuntimeError('Download model checkpoints first: python download_models.py')
    embedding=None
    for path in paths:
        print('Loading',path.parent.name,flush=True)
        model=load_model(path)
        pred=np.asarray(model.predict(ds)).reshape(len(molecules),len(TASKS))
        all_preds.append(pred)
        checks.append(dict(name=path.parent.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        if embedding is None:
            try: embedding=np.asarray(model.predict_embedding(ds)).reshape(len(molecules),-1)
            except (AttributeError,NotImplementedError) as e: print('Embedding API unavailable:',e,flush=True)
        del model
    scores=np.mean(all_preds,axis=0);std=np.std(all_preds,axis=0)
    for idx,row in enumerate(molecules):
        row['predictions']={t:round(float(scores[idx,j]),6) for j,t in enumerate(TASKS)}
        row['ensemble_std']={t:round(float(std[idx,j]),6) for j,t in enumerate(TASKS)}
        if embedding is not None: row['embedding']=[round(float(v),6) for v in embedding[idx]]
    result=dict(generated_at=datetime.now(timezone.utc).isoformat(),inference_runtime={name:version(name) for name in ['torch','deepchem','dgl','openpom','numpy']},model='OpenPOM MPNNPOMModel',mode='real_cached_inference',ensemble_size=len(paths),embedding_model='experiments_1' if embedding is not None else None,labels=TASKS,molecules=molecules,checkpoints=checks,source='https://github.com/ARY2260/openpom',note='Single-molecule predictions only; scores are not scent intensity, safety, mixture predictions, or calibrated recreation confidence.')
    out=BASE.parent/'dist'/'predictions.json';out.write_text(json.dumps(result,separators=(',',':')))
    print('Saved real predictions:',out,'molecules',len(molecules),'embedding',None if embedding is None else embedding.shape,flush=True)
    return result
if __name__=='__main__': build_cache()
