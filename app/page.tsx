import { BoxCalculator } from "./components/BoxCalculator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-zinc-100 dark:bg-zinc-950">
      <BoxCalculator />
    </main>
  );
}
