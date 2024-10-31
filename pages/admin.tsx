import Link from "next/link";
import { Button } from "@mantine/core";

const AdminPage = () => {
  return (
    <div>
      <main>
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
