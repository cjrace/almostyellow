import Link from "next/link";
import { Button, Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const AdminPage = () => {
  return (
    <div>
      <main>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>

        <h1>Welcome to our admin page</h1>

        <div>
          <Link href="/admin/chopinliszt">Chopin Liszt</Link>
          <Link href="/admin">???</Link>
          <Link href="/admin">???</Link>
        </div>

        <Button leftSection="🏠" variant="default" component="a" href="/">
          Back to homepage
        </Button>
      </main>
    </div>
  );
};

export default AdminPage;
