import { useParams, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ContractorDetailPage } from "./auction/ContractorsPage";

const ContractorPublicPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contractorId = parseInt(id || "0", 10);

  if (!contractorId) {
    return (
      <div className="min-h-screen bg-background font-golos flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Icon name="AlertCircle" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Неверная ссылка</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-golos">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center"
          >
            <img
              src="https://cdn.poehali.dev/projects/7b6a137b-add6-4931-a12d-8f298fde2eca/bucket/a2e7eb89-e190-4ece-8d2f-164c39a974fd.png"
              alt="Tender Pro"
              className="h-10 w-auto object-contain"
            />
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon name="Home" size={14} />
            На главную
          </button>
        </div>
      </header>
      <ContractorDetailPage contractorId={contractorId} onBack={() => navigate("/")} />
    </div>
  );
};

export default ContractorPublicPage;