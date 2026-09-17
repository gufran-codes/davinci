import Link from "next/link";
import { ArrowRight, Leaf, Lightbulb, BookOpen } from "lucide-react";
import { Brand, ButtonLink } from "@/components/ui";
export default function Home() {
  return (
    <div className="marketing">
      <header>
        <Brand />
        <nav>
          <Link href="/login">Sign in</Link>
          <ButtonLink href="/signup">
            Meet Primer
            <ArrowRight size={16} />
          </ButtonLink>
        </nav>
      </header>
      <main>
        <section className="marketing-hero">
          <span className="eyebrow">SMALL STEPS. A WORLD OF POSSIBILITY.</span>
          <h1>
            A tutor that learns
            <br />
            how to teach <em>your child.</em>
          </h1>
          <p>
            Because understanding doesn’t happen the same way for everyone.
            Thoughtful math practice that remembers what helps — and finds
            another way when it doesn’t.
          </p>
          <ButtonLink href="/signup">
            Find their starting point
            <ArrowRight size={19} />
          </ButtonLink>
          <span className="small muted">For curious minds, ages 7–11.</span>
          <div className="marketing-proof">
            <span>
              <Leaf size={18} />
              Their pace
            </span>
            <span>
              <Lightbulb size={18} />
              More than one way
            </span>
            <span>
              <BookOpen size={18} />
              Understanding that stays
            </span>
          </div>
        </section>
        <section className="marketing-bottom">
          <p className="eyebrow">A LITTLE MORE “I GET IT.”</p>
          <h2>
            It starts with listening.
            <br />
            It gets better with learning.
          </h2>
          <div>
            <p>
              Primer finds out what your child knows, notices where they get
              stuck, and remembers which explanations helped.
            </p>
            <p>
              You see the small steps taking shape. They get a patient place to
              try, wonder, and figure things out.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <Brand small />
        <span>Thoughtful learning. One child at a time.</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
