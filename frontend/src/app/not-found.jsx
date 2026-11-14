import NotFoundClient from "./not-found-client";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
