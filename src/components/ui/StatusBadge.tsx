import { useTranslation } from "react-i18next";
import { getStatusTone, type RepairStatus } from "@/utils/status";
import "./StatusBadge.css";

export function StatusBadge({ status }: { status: RepairStatus }) {
  const { t } = useTranslation();
  const tone = getStatusTone(status);

  return (
    <span className={`tl-badge tl-badge--${tone}`}>
      {tone === "progress" && <span className="tl-badge__pulse" aria-hidden="true" />}
      {t(`status.${status}`)}
    </span>
  );
}
