import { SubmitForm } from "./submit-form";

export const metadata = { title: "Submit an Event" };

export default function SubmitEventPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Submit an Event</h1>
      <p className="mt-1 text-muted-foreground">
        Know about a tech event in Europe? Let us know!
      </p>
      <SubmitForm />
    </div>
  );
}
