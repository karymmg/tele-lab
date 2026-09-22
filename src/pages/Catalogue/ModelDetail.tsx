import { useParams } from "react-router-dom";

export function ModelDetail() {
  const { slug } = useParams();

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Modèle: {slug}</h1>
      <p>Chargement du modèle...</p>
    </div>
  );
}
