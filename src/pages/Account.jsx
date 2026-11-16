import { Navigate, useParams } from "react-router-dom";

const accounts = {
  extra: "Extra account",
  tech: "Tech account",
  main: "Main account",
  lunez: "Lunez account",
  stake: "Stake account"
};

export default function Account() {
  const { account } = useParams();
  const title = accounts[account];
  if (!title) return <Navigate to="/" replace />;

  return (
    <section>
      <header className="page-head">
        <h1>{title}</h1>
      </header>
    </section>
  );
}
