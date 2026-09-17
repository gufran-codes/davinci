import { Brand } from "@/components/ui";
export default function Privacy() {
  return (
    <main className="legal">
      <Brand />
      <p className="eyebrow">EARLY-STAGE MVP NOTICE · SEPTEMBER 2026</p>
      <h1>Your family’s information.</h1>
      <p>
        Primer stores a parent email, a password hash, child nicknames, age and
        grade, learning goals, practice outcomes, teaching evidence, and
        uploaded homework images. Children do not need email addresses.
      </p>
      <h2>How information is used</h2>
      <p>
        Learning records help choose lessons, adjust explanations, and show
        progress to the parent. Product events help evaluate whether the app is
        useful. There are no advertising trackers or child social features.
      </p>
      <h2>Where it goes</h2>
      <p>
        This version stores records and private images on the server running
        Primer. If its operator enables OpenAI, mathematical lesson context and
        uploaded homework images may be sent to OpenAI for explanation or
        concept identification. The app requests that API responses are not
        stored; the provider’s own data retention policies still apply. Parent
        names, emails, and child nicknames are not sent in tutor requests.
      </p>
      <h2>Your choices</h2>
      <p>
        You can export learning records or permanently delete your account,
        child profiles, and images in Settings. Records are kept until deleted.
        Recent learner evidence is limited to 100 entries per concept;
        structured session events remain until account deletion. The app avoids
        retaining children’s raw answer text.
      </p>
      <h2>An early product</h2>
      <p>
        This is an early-stage MVP for parent-supervised evaluation. Its privacy
        practices and legal terms require review before a public family launch.
        It does not claim COPPA, FERPA, or GDPR certification. The operator must
        provide a contact address, deployment-specific retention details, and
        applicable parental consent procedures before public use.
      </p>
    </main>
  );
}
