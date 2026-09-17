import { register } from "../src/server/auth";
import { seedChildren } from "../src/server/demo";
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is disabled in production.");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 10)
  throw new Error("Set DEMO_PASSWORD to a password of at least 10 characters.");
const user = register("Alex", "alex@primer.local", password);
seedChildren(user.id);
console.log(
  "Seeded Alex, Maya, Adam, and Sofia. Sign in as alex@primer.local with your DEMO_PASSWORD.",
);
