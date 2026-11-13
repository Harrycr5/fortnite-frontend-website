
import { useState } from "react";
import { useStats } from "../hooks/useStats";

function StatsPage() {
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState("epic");
  const [timeWindow, setTimeWindow] = useState("lifetime");

  const { stats, loading, error, searchPlayer } = useStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) return;

    searchPlayer(username, accountType, timeWindow);
  };

  return (
    <main>
      <h1>Fortnite Tracker</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter Epic username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
        >
          <option value="epic">Epic Games</option>
          <option value="psn">PlayStation</option>
          <option value="xbl">Xbox</option>
        </select>

        <select
          value={timeWindow}
          onChange={(e) => setTimeWindow(e.target.value)}
        >
          <option value="lifetime">Lifetime</option>
          <option value="season">Current Season</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Player"}
        </button>
      </form>

      {error && <p>{error}</p>}

      {stats && (
        <section>
          <h2>{stats.account.name}</h2>

          <p>Battle Pass Level: {stats.battlePass.level}</p>
          <p>Progress: {stats.battlePass.progress}%</p>

          <h3>Overall Statistics</h3>

          <p>Wins: {stats.stats.all.overall?.wins ?? 0}</p>
          <p>Kills: {stats.stats.all.overall?.kills ?? 0}</p>
          <p>K/D: {stats.stats.all.overall?.kd ?? 0}</p>
          <p>Win Rate: {stats.stats.all.overall?.winRate ?? 0}%</p>
          <p>Matches: {stats.stats.all.overall?.matches ?? 0}</p>
        </section>
      )}
    </main>
  );
}

export default StatsPage;
