import Link from "next/link";
import {
  ArrowRight,
  Mic,
  PenLine,
  Sparkles,
  BookOpen,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";
import { Brand, ButtonLink } from "@/components/ui";
import styles from "./welcome.module.css";

export default function Home() {
  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#for-parents">For parents</Link>
          <Link href="/login">Sign in</Link>
          <ButtonLink href="/signup">
            Meet Da Vinci <ArrowRight size={16} />
          </ButtonLink>
        </nav>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.arch} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <p className={styles.eyebrow}>
            A PERSONAL TUTOR. A WORLD TO DISCOVER.
          </p>
          <h1>
            A tutor that learns
            <br />
            how to teach <em>your child.</em>
          </h1>
          <p>
            Talk it through. See it differently. Find that “I get it.”
            <br />
            Learning that starts with who they are, and grows with them.
          </p>
          <div className={styles.heroActions}>
            <ButtonLink href="/signup">
              Find their starting point <ArrowRight size={18} />
            </ButtonLink>
            <Link href="#how-it-works">Take a look inside ↓</Link>
          </div>
          <div className={styles.subjects}>
            <span>Math</span>
            <span>English</span>
            <span>Science</span>
            <span>Social Studies</span>
          </div>
          <div
            className={styles.preview}
            aria-label="Illustrative tutoring example"
          >
            <div className={styles.previewBar}>
              <Brand small />
              <span>One idea. More than one way.</span>
              <span className={styles.previewBadge}>Illustrative example</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewTutor}>
                <span className={styles.orb}>
                  <Sparkles size={28} />
                </span>
                <p className={styles.eyebrow}>LET’S THINK TOGETHER</p>
                <h2>
                  Same amount.
                  <br />A different picture.
                </h2>
                <p>
                  “You know how to split a whole in half. What happens if we
                  split each piece again?”
                </p>
                <span className={styles.voicePill}>
                  <Mic size={14} />
                  Room to think out loud
                </span>
              </div>
              <div className={styles.previewBoard}>
                <p>EXPLORE EQUIVALENT FRACTIONS</p>
                <div className={styles.fractionPair}>
                  <div>
                    <span className={styles.bar}>
                      <i />
                      <i />
                    </span>
                    <strong>1 / 2</strong>
                  </div>
                  <span>↔</span>
                  <div>
                    <span className={`${styles.bar} ${styles.quarters}`}>
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>2 / 4</strong>
                  </div>
                </div>
                <p className={styles.boardQuestion}>What stayed the same?</p>
                <div className={styles.personalization}>
                  <Sparkles size={15} />
                  <span>
                    A familiar idea becomes a bridge to something new.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className={styles.features}>
          <p className={styles.eyebrow}>UNDERSTANDING IS PERSONAL</p>
          <h2>
            There’s more than one way
            <br />
            to make an idea click.
          </h2>
          <p>
            Da Vinci remembers what helps, notices what needs work,
            <br />
            and adjusts the next step.
          </p>
          <div className={styles.featureGrid}>
            {[
              {
                icon: Mic,
                title: "A real back-and-forth.",
                text: "Ask a question, talk through your thinking, or interrupt when you need another explanation.",
              },
              {
                icon: PenLine,
                title: "A shared space to think.",
                text: "Explore pictures, number lines, and worked steps. Draw your own ideas on the whiteboard.",
              },
              {
                icon: Sparkles,
                title: "A tutor that gets to know you.",
                text: "Strengths, misconceptions, and the help you needed shape what Da Vinci tries next.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span>
                  <Icon size={28} strokeWidth={1.4} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="for-parents" className={styles.parents}>
          <div>
            <p className={styles.eyebrow}>FOR THE PEOPLE CHEERING THEM ON</p>
            <h2>
              See the learning.
              <br />
              <em>Understand the progress.</em>
            </h2>
            <p>
              Look beyond a score. See what your child can do independently,
              where they still need support, and why Da Vinci chose a different
              approach.
            </p>
            <ButtonLink href="/signup">
              Create your family’s space <ArrowRight size={17} />
            </ButtonLink>
          </div>
          <div className={styles.parentNotes}>
            {[
              {
                icon: BookOpen,
                title: "Every session leaves a story.",
                text: "Review what clicked, what was tricky, and what comes next.",
              },
              {
                icon: GraduationCap,
                title: "Their grade. Their starting point.",
                text: "Choose a grade and subjects. Earlier foundations stay within reach when they’re needed.",
              },
              {
                icon: HeartHandshake,
                title: "Support that gradually steps back.",
                text: "A correct answer with help is different from understanding it independently. Da Vinci tracks both.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={24} strokeWidth={1.4} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.faq}>
          <div>
            <p className={styles.eyebrow}>A FEW THINGS TO KNOW</p>
            <h2>Curious?</h2>
          </div>
          <div>
            {[
              [
                "How does Da Vinci personalize a lesson?",
                "It uses skill evidence, prerequisite knowledge, misconceptions, and past teaching outcomes to choose a strategy. The explanation can change; what counts as a correct answer does not.",
              ],
              [
                "Can my child type instead of speaking?",
                "Yes. Lessons support voice, typed replies, answer choices, and the shared whiteboard.",
              ],
              [
                "Which grades are available?",
                "Profiles support Grades 1–10. Current teaching content covers Grades 1–5 and is still being reviewed. Grades 6–10 will become available as curriculum is imported and reviewed.",
              ],
              [
                "Can we bring schoolwork?",
                "You can upload a photo or PDF up to 5 MB. Da Vinci can identify a related available skill to practice before your child returns to the original problem.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.closing}>
          <Sparkles size={30} />
          <h2>
            A little curiosity.
            <br />A new way forward.
          </h2>
          <ButtonLink href="/signup">
            Meet your Da Vinci <ArrowRight size={18} />
          </ButtonLink>
        </section>
      </main>
      <footer className={styles.footer}>
        <Brand small />
        <p>A tutor that learns how to teach each child.</p>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
