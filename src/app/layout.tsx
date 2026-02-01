export const metadata = {
  title: "Crypto Intelligence",
  description: "Track crypto movers and predict market movements",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
