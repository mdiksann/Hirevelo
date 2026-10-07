"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { HomeIcon } from "@/components/marketing/home-icon";
import { StageBadge } from "@/components/applications/stage-badge";

const stages = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFERING",
  "HIRED",
] as const;

export function HeroVisual() {
  const t = useTranslator();
  const cards = [
    { title: "CV and cover note received", icon: "document" },
    { title: "Candidate application", icon: "candidate" },
    {
      title: "Interview notes recorded",
      icon: "conversation",
    },
    { title: "Application decision", icon: "briefcase" },
    { title: "Hiring decision recorded", icon: "decision" },
  ] as const;
  return (
    <section
      aria-label={t("Hiring pipeline example")}
      className="home-candidates"
    >
      {cards.map(({ title, icon }, index) => (
        <div className={`home-candidate home-candidate-${index}`} key={title}>
          <span className="home-avatar" aria-hidden="true">
            <HomeIcon name={icon} size={64} />
          </span>
          <p>{t(title)}</p>
        </div>
      ))}
      <p className="home-scene-caption">
        {t("One application, from first review to final decision")}
      </p>
    </section>
  );
}

export function PipelineVisual() {
  const t = useTranslator();
  return (
    <div className="home-product-scene">
      <span className="home-floating-icon home-float-file" aria-hidden="true">
        <HomeIcon name="document" size={64} />
      </span>
      <span className="home-floating-icon home-float-people" aria-hidden="true">
        <HomeIcon name="candidate" size={64} />
      </span>
      <span className="home-floating-icon home-float-check" aria-hidden="true">
        <HomeIcon name="decision" size={64} />
      </span>
      <div className="home-product-window">
        <div className="home-window-heading">
          <HomeIcon name="briefcase" size={32} />
          <span>{t("Candidate application")}</span>
          <StageBadge stage="SCREENING" />
        </div>
        <div className="home-window-body">
          <div className="home-document">
            <HomeIcon name="document" size={48} />
            <h3>{t("CV and cover note")}</h3>
            <div className="home-document-lines" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>{t("Interview notes")}</p>
            <div className="home-document-lines" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="home-application-summary">
            <span className="home-profile" aria-hidden="true">
              <HomeIcon name="candidate" size={56} />
            </span>
            <h3>{t("Application history")}</h3>
            <ol aria-label={t("Recruitment stages")}>
              {stages.map((stage) => (
                <li key={stage}>
                  <StageBadge stage={stage} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowVisual({ step }: { step: number }) {
  const t = useTranslator();
  return (
    <div className={`home-workflow-visual home-workflow-visual-${step}`}>
      <div className="home-workflow-window">
        {step === 0 ? (
          <>
            <div className="home-window-heading">
              <HomeIcon name="briefcase" size={32} />
              <span>{t("Job details")}</span>
            </div>
            <div className="home-preview-content">
              <h3>{t("Description")}</h3>
              <p>{t("Responsibilities and requirements")}</p>
              <div className="home-document-lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <h3>{t("Location and employment")}</h3>
              <p>{t("Where and how the candidate will work")}</p>
              <span className="home-published">
                <HomeIcon name="decision" size={24} />
                {t("Draft → Published")}
              </span>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <div className="home-window-heading">
              <HomeIcon name="candidate" size={32} />
              <span>{t("Candidate application")}</span>
            </div>
            <div className="home-preview-content">
              <StageBadge stage="SCREENING" />
              <ul className="home-review-list">
                <li>
                  <HomeIcon name="document" size={28} />
                  {t("CV and cover note")}
                </li>
                <li>
                  <HomeIcon name="conversation" size={28} />
                  {t("Interview notes")}
                </li>
                <li>
                  <HomeIcon name="decision" size={28} />
                  {t("Stage changes and activity history")}
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="home-window-heading">
              <HomeIcon name="decision" size={32} />
              <span>{t("Application decision")}</span>
            </div>
            <div className="home-preview-content">
              <div className="home-decision-stages">
                <StageBadge stage="OFFERING" />
                <StageBadge stage="HIRED" />
                <StageBadge stage="REJECTED" />
              </div>
              <p>
                {t(
                  "The final stage stays visible to the candidate. A rejection includes a reason.",
                )}
              </p>
              <div className="home-document-lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
