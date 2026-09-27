import Link from "next/link";
import { ArrowRight, CalendarDays, Users, HeartHandshake } from "lucide-react";
import { Button } from "@/shared/ui/button";
export default function HomePage() {
  return (
    <div className="space-y-20 py-8 md:py-16">
      <section className="max-w-3xl">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Your people. Your day.
        </p>
        <h1 className="font-display text-5xl leading-tight tracking-tight md:text-7xl">
          Every shared moment
          <br />
          <span className="text-primary">starts with an invitation.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
          A thoughtful space to bring your wedding plans and the people you love together.
        </p>
        <Button asChild className="mt-8">
          <Link href="/login">
            Open your workspace
            <ArrowRight />
          </Link>
        </Button>
      </section>
      <section aria-label="What InviteMe is being built for" className="grid gap-6 md:grid-cols-3">
        {[
          {
            Icon: CalendarDays,
            title: "One beautiful beginning",
            text: "A place for your story, your celebration, and the details that matter.",
          },
          {
            Icon: Users,
            title: "Everyone, thoughtfully included",
            text: "An invitation experience designed around your guests.",
          },
          {
            Icon: HeartHandshake,
            title: "Plan together",
            text: "A shared workspace for you and your trusted co-hosts.",
          },
        ].map(({ Icon, title, text }) => (
          <article key={title} className="rounded-xl border bg-card p-7">
            <Icon className="mb-6 size-6 text-primary" aria-hidden="true" />
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>
      <p className="text-sm text-muted-foreground">
        InviteMe is in development. Wedding planning features are coming in future milestones.
      </p>
    </div>
  );
}
