import { useSearchParams } from "react-router-dom";

export function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Résultats pour: {query}</h1>
      <p>Recherche en cours...</p>
    </div>
  );
}
