import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function Catalogue() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Catalogue des Produits</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Placeholder for products */}
        <p>Chargement des produits...</p>
      </div>
    </div>
  );
}
