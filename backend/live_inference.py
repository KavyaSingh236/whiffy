"""Fresh CPU inference. Only known catalog SMILES and upstream checkpoints are accepted."""
import hashlib
import json
import os
import threading
from pathlib import Path
import numpy as np
from inference import BASE, TASKS, load_model

class LiveOpenPOM:
    def __init__(self):
        self.lock = threading.Lock()
        self.models = []
        self.checkpoints = []

    def predict(self, molecules):
        # DGL/model state is shared; serialize CPU inference, never block the ASGI loop.
        with self.lock:
            import torch
            import deepchem as dc
            from rdkit import Chem
            from openpom.feat.graph_featurizer import GraphFeaturizer
            torch.set_num_threads(2)
            if not self.models:
                count = int(os.getenv('WHIFFY_ENSEMBLE_SIZE', '1'))
                if not 1 <= count <= 10:
                    raise RuntimeError('WHIFFY_ENSEMBLE_SIZE must be between 1 and 10.')
                paths = [BASE / 'models' / f'experiments_{i}' / 'checkpoint2.pt' for i in range(1, count + 1)]
                if any(not p.exists() for p in paths):
                    raise RuntimeError('OpenPOM checkpoints are missing. Run backend/download_models.py.')
                expected=json.loads((BASE/'checkpoints.json').read_text())
                if any(hashlib.sha256(p.read_bytes()).hexdigest()!=expected[p.parent.name] for p in paths):
                    raise RuntimeError('Checkpoint checksum mismatch; refusing model load.')
                models = [load_model(p) for p in paths]
                self.checkpoints = [{'name': p.parent.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
                self.models = models
            smiles = []
            for molecule in molecules:
                mol = Chem.MolFromSmiles(molecule['smiles'])
                if mol is None:
                    raise ValueError('Invalid catalog structure: ' + molecule['id'])
                smiles.append(Chem.MolToSmiles(mol))
            ds = dc.data.NumpyDataset(GraphFeaturizer().featurize(smiles))
            with torch.no_grad():
                predictions = [np.asarray(model.predict(ds)).reshape(len(molecules), len(TASKS)) for model in self.models]
                embeddings = np.asarray(self.models[0].predict_embedding(ds)).reshape(len(molecules), -1)
            mean, std = np.mean(predictions, axis=0), np.std(predictions, axis=0)
            if not np.isfinite(mean).all() or not np.isfinite(embeddings).all():
                raise RuntimeError('OpenPOM returned non-finite values.')
            if ((mean < 0) | (mean > 1)).any():
                raise RuntimeError('OpenPOM returned invalid probabilities.')
            output = []
            for i, row in enumerate(molecules):
                output.append({**row, 'smiles': smiles[i],
                    'predictions': dict(zip(TASKS, np.round(mean[i], 6).tolist())),
                    'ensemble_std': dict(zip(TASKS, np.round(std[i], 6).tolist())),
                    'embedding': np.round(embeddings[i], 6).tolist()})
            return {'mode': 'live_openpom', 'model': 'OpenPOM MPNNPOMModel', 'ensemble_size': len(self.models),
                'embedding_model': 'experiments_1', 'labels': TASKS, 'checkpoints': self.checkpoints, 'molecules': output}

runtime = LiveOpenPOM()
