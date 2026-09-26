import { Brand } from "@/components/ui";
export default function Privacy() {
  return (
    <main className="legal">
      <Brand />
      <p className="eyebrow">EARLY-STAGE MVP NOTICE · SEPTEMBER 2026</p>
      <h1>Your family’s information.</h1>
      <p>
        Da Vinci stores a parent email, a password hash, child nicknames, age
        and grade, learning goals, practice outcomes, teaching evidence, and
        uploaded homework images and documents. Conversational lessons also
        store the child&apos;s transcript, the tutor text Da Vinci generated,
        and the portion of that text reported as spoken. Saved whiteboard work
        and answer-access settings are also stored. Children do not need email
        addresses.
      </p>
      <h2>How information is used</h2>
      <p>
        Learning records help choose lessons, adjust explanations, and show
        progress to the parent. Product events help evaluate whether the app is
        useful. There are no advertising trackers or child social features.
      </p>
      <h2>Where it goes</h2>
      <p>
        This version stores records, transcripts, and private images on the
        server running Da Vinci. If its operator enables OpenAI, structured
        lesson context, selected typed board work, recent educational responses,
        a limited history of speech confirmed as delivered, and uploaded
        homework images may be sent to OpenAI for utterance interpretation,
        explanation, or concept identification. If realtime voice is enabled,
        audio is processed by LiveKit and the configured speech-to-text and
        text-to-speech providers. Da Vinci disables room recording, but each
        provider&apos;s own processing and retention terms still apply. Parent
        names, emails, and child nicknames are not included in tutor model
        requests.
      </p>
      <h2>Your choices</h2>
      <p>
        You can export learning records or permanently delete your account,
        child profiles, and images in Settings. Records are kept until deleted.
        Recent learner evidence is limited to 100 entries per concept;
        structured session events and conversational transcripts remain until
        account deletion. Exports include these conversational records.
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
