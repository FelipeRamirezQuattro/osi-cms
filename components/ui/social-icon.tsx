export type SocialNetwork = "Facebook" | "LinkedIn" | "YouTube" | "Instagram";

export function SocialIcon({ network, className = "h-[1.125rem] w-[1.125rem]" }: { network: SocialNetwork; className?: string }) {
  let path: React.ReactNode;
  if (network === "Facebook") {
    path = <path d="M13.5 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4Z" />;
  } else if (network === "LinkedIn") {
    path = <path d="M6.2 8.4H3V21h3.2V8.4ZM4.6 3A1.9 1.9 0 1 0 4.6 6.8 1.9 1.9 0 0 0 4.6 3Zm5 5.4V21h3.2v-6.2c0-1.7.3-3.3 2.4-3.3 2 0 2 1.9 2 3.4V21h3.3v-6.9c0-3.4-.8-6-4.7-6a4.1 4.1 0 0 0-3.7 2h-.1V8.4H9.6Z" />;
  } else if (network === "YouTube") {
    path = <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.9C18.2 4.9 12 4.9 12 4.9s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.9A27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.9c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.9A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z" />;
  } else {
    path = <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.8 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-current`}>{path}</svg>;
}
