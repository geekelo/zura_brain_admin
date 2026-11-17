import { Navigate, useParams } from "react-router-dom";
import ExtraAccount from "./ExtraAccount";
import TechAccount from "./TechAccount";
import MainAccount from "./MainAccount";
import LunezAccount from "./LunezAccount";
import StakeAccount from "./StakeAccount";
import SanctionAccount from "./SanctionAccount";
import ClientSupportAccount from "./ClientSupportAccount";

const accounts = {
  extra: "Extra account",
  tech: "Tech account",
  main: "Main account",
  lunez: "Lunez account",
  stake: "Stake account",
  sanction: "Sanction account",
  "client-support": "Client support account"
};

export default function Account() {
  const { account } = useParams();
  if (account === "extra") return <ExtraAccount />;
  if (account === "tech") return <TechAccount />;
  if (account === "main") return <MainAccount />;
  if (account === "lunez") return <LunezAccount />;
  if (account === "stake") return <StakeAccount />;
  if (account === "sanction") return <SanctionAccount />;
  if (account === "client-support") return <ClientSupportAccount />;
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
