"""Download unmodified public upstream checkpoints; never execute a user-uploaded pickle."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlretrieve
BASE=Path(__file__).resolve().parent/'models'
def download(i):
    p=BASE/f'experiments_{i}'/'checkpoint2.pt';p.parent.mkdir(parents=True,exist_ok=True)
    if not p.exists() or p.stat().st_size<1000:
        urlretrieve(f'https://media.githubusercontent.com/media/ARY2260/openpom/main/models/ensemble_models/experiments_{i}/checkpoint2.pt',p)
    print(f'Model {i}: {p.stat().st_size} bytes',flush=True)
if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=3) as pool: list(pool.map(download,range(1,11)))
