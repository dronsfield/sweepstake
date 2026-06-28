import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrawResults } from "@/components/DrawResults";
import { AllTeams } from "@/components/AllTeams";
import { getDb } from "@/lib/mongodb";
import { getGroup } from "@/lib/groups";
import { getWorldCupStatuses } from "@/lib/worldCupStatus";
import { Participant } from "@/lib/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function getParticipants(groupSlug: string): Promise<Participant[]> {
  const db = await getDb();
  const participants = await db
    .collection<Participant>("participants")
    .find({ group: groupSlug }, { projection: { _id: 0 } })
    .sort({ drawnAt: 1 })
    .toArray();
  return participants;
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group: groupSlug } = await params;
  const group = getGroup(groupSlug);

  if (!group) notFound();

  const [participants, wcStatus] = await Promise.all([
    getParticipants(groupSlug),
    getWorldCupStatuses(),
  ]);
  const allDrawn = participants.length >= group.whitelist.length;
  const eliminatedTeams = new Set(
    wcStatus.teams
      .filter((t) => !t.stillInTournament)
      .map((t) => t.name),
  );

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <Image
          src="/wclogoedit.png"
          alt="FIFA World Cup 2026"
          width={140}
          height={200}
          className={styles.logo}
          style={{ height: "auto" }}
          priority
        />
        <div className={styles.heroText}>
          <h1 className={styles.title}>
            <span className={styles.green}>WC26</span>{" "}
            <span className={styles.gold}>Sweepstake</span>
          </h1>
          <p className={styles.groupName}>{group.displayName}</p>
        </div>
        {!allDrawn && (
          <Link href={`/${groupSlug}/draw`} className={styles.ctaButton}>
            Enter the Draw
          </Link>
        )}
      </header>

      <main className={styles.main}>
        <h2 className={styles.resultsHeading}>Draw Results</h2>
        <DrawResults
          participants={participants}
          allNames={group.whitelist}
          eliminatedTeams={[...eliminatedTeams]}
          groupName={group.displayName}
        />

        <h2 className={styles.teamsHeading}>All Teams</h2>
        <AllTeams
          participants={participants}
          participantCount={group.whitelist.length}
          eliminatedTeams={[...eliminatedTeams]}
        />
      </main>
    </div>
  );
}
