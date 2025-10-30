import React from "react";
import "./Breadcrumb.css";

export default function Breadcrumb({ items, onNavigate }) {
  return (
    <nav className="breadcrumb">
      {items.map((item, idx) => (
        <span
          key={idx}
          style={{
            cursor: idx < items.length - 1 ? "pointer" : "default",
            color: idx < items.length - 1 ? "#ffd700" : "#fff",
            fontWeight: idx === items.length - 1 ? 700 : 400,
            marginRight: 4
          }}
          onClick={() => idx < items.length - 1 && onNavigate(idx)}
        >
          {item}
          {idx < items.length - 1 && <span style={{ color: "#fff", margin: "0 6px" }}>&gt;</span>}
        </span>
      ))}
    </nav>
  );
}
