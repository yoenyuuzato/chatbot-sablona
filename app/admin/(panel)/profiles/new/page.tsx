import { connection } from "next/server";
import { hasDb } from "@/lib/db";
import { NoDb, PageHeader } from "../../ui";
import { ProfileForm } from "../profile-form";
import { EMPTY_PROFILE } from "../profile-values";

export const metadata = { title: "Nový profil" };

export default async function NewProfilePage() {
  await connection();
  return (
    <>
      <PageHeader title="Nový profil" />
      {hasDb() ? <ProfileForm initial={EMPTY_PROFILE} mode="create" /> : <NoDb />}
    </>
  );
}
