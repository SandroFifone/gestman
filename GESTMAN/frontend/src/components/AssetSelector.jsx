import React, { useEffect, useState } from "react";
import { API_URLS } from "../config/api";

// Props: onSelect(civico, asset), selectedCivico, selectedAsset
const AssetSelector = ({ onSelect, selectedCivico, selectedAsset }) => {
  const [civici, setCivici] = useState([]);
  const [assets, setAssets] = useState([]);
  const [civico, setCivico] = useState(selectedCivico || "");
  const [asset, setAsset] = useState(selectedAsset || "");
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    // Carica civici all'avvio
    fetch(API_URLS.civici)
      .then(res => res.json())
      .then(data => setCivici(data.civici || []));
  }, []);

  useEffect(() => {
    if (!civico) {
      setAssets([]);
      setAsset("");
      return;
    }
    setLoadingAssets(true);
    fetch(`${API_URLS.assets}?civico=${encodeURIComponent(civico)}`)
      .then(res => res.json())
      .then(data => {
        setAssets(data.assets || []);
        setLoadingAssets(false);
      });
  }, [civico]);

  const handleCivicoChange = e => {
    setCivico(e.target.value);
    setAsset("");
    onSelect(e.target.value, "");
  };

  const handleAssetChange = e => {
    setAsset(e.target.value);
    const selected = assets.find(a => a["Id Aziendale"] === e.target.value);
    onSelect(civico, e.target.value, selected ? selected.tipo : undefined);
  };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
      <div>
        <label style={{ fontWeight: 500 }}>Civico:&nbsp;</label>
        <select value={civico} onChange={handleCivicoChange} style={{ minWidth: 120 }}>
          <option value="">Seleziona civico</option>
          {civici.map(c => (
            <option key={c.numero} value={c.numero}>{c.numero} {c.descrizione ? `- ${c.descrizione}` : ""}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontWeight: 500 }}>Asset:&nbsp;</label>
        <select value={asset} onChange={handleAssetChange} disabled={!civico || loadingAssets} style={{ minWidth: 180 }}>
          <option value="">{loadingAssets ? "Caricamento..." : "Seleziona asset"}</option>
          {assets.map(a => (
            <option key={a["Id Aziendale"]} value={a["Id Aziendale"]}>{a["Id Aziendale"]} - {a.tipo}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AssetSelector;
