import { Brand } from "./ui";
import { AuthForm } from "./forms";
import { Leaf } from "lucide-react";
export function AuthPage({ signup }: { signup: boolean }) {
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">THEIR OWN WAY TO UNDERSTAND.</span>
          <h1>
            Every mind
            <br />
            has a little
            <br />
            <em>magic.</em>
          </h1>
          <p>
            A thoughtful place to find it.
            <br />
            One small discovery at a time.
          </p>
          <Leaf size={78} strokeWidth={1} />
        </div>
        <span className="small">
          A tutor that learns how to teach your child.
        </span>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <p className="eyebrow">
            {signup ? "A GOOD PLACE TO BEGIN" : "HELLO AGAIN"}
          </p>
          <h1>
            {signup
              ? "A little learning.\nA lot of possibility."
              : "Welcome back."}
          </h1>
          <p className="muted">
            {signup
              ? "Create your parent account. We’ll take it one step at a time."
              : "Your family’s learning is right where you left it."}
          </p>
          <AuthForm
            signup={signup}
            demo={process.env.NODE_ENV === "development"}
          />
        </div>
      </main>
    </div>
  );
}
