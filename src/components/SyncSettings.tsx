import { useState } from 'react';
import { connect, disconnect, syncNow, TOKEN_URL, useSyncStatus } from '../lib/sync';

export function since(iso?: string) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

export function SyncSettings() {
  const st = useSyncStatus();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  if (st.connected) {
    return (
      <div className="sync">
        <p className="sync-state">
          <span className={`dot ${st.state}`} />
          {st.state === 'syncing' ? 'Synchronisation en cours…' : st.state === 'error' ? 'La dernière synchronisation a échoué.' : st.state === 'offline' ? 'Hors ligne.' : `Synchronisé ${since(st.lastSync)}`}
        </p>
        <p className="aside">Compte GitHub : <b>{st.login}</b>. Votre progression est fusionnée automatiquement entre vos appareils : à l’ouverture de l’app et quelques secondes après chaque exercice.</p>
        {st.message && <p className="sync-msg">{st.message}</p>}
        <div className="row">
          <button className="btn ghost grow" disabled={st.state === 'syncing'} onClick={() => syncNow()}>Synchroniser maintenant</button>
        </div>
        <button className="link small-link" onClick={() => { if (confirmDisconnect()) disconnect(); }}>Déconnecter cet appareil</button>
      </div>
    );
  }

  return (
    <div className="sync">
      <p className="aside">Retrouvez la même progression sur votre iPhone et votre ordinateur. Elle est enregistrée dans un fichier privé de votre compte GitHub. À faire une fois par appareil :</p>
      <ol className="sync-steps">
        <li>
          <a href={TOKEN_URL} target="_blank" rel="noreferrer">Ouvrez la page de création de clé GitHub</a>. La case <b>gist</b> est déjà cochée : ne cochez rien d’autre.
        </li>
        <li>À <i>Expiration</i>, choisissez <b>No expiration</b>, puis cliquez sur <b>Generate token</b> en bas de la page.</li>
        <li>Copiez la clé affichée (elle commence par <code>ghp_</code>) et collez-la ici. Gardez-la dans vos notes pour vos autres appareils : GitHub ne la montre qu’une fois.</li>
      </ol>
      <input className="answer" type="password" autoComplete="off" placeholder="ghp_…" value={token} onChange={(e) => setToken(e.target.value)} />
      {st.message && <p className="sync-msg">{st.message}</p>}
      <button
        className="btn primary block"
        disabled={!token.trim() || busy}
        onClick={async () => {
          setBusy(true);
          try { await connect(token); setToken(''); } catch { /* message affiché */ }
          setBusy(false);
        }}
      >
        {busy ? 'Connexion…' : 'Connecter cet appareil'}
      </button>
      <p className="hint small">Cette clé ne donne accès qu’à vos gists, pas à vos dépôts. Elle reste sur cet appareil.</p>
    </div>
  );
}

function confirmDisconnect() {
  try {
    return window.confirm('Déconnecter cet appareil ? La progression reste sur l’appareil, mais ne sera plus synchronisée.');
  } catch {
    return true;
  }
}
