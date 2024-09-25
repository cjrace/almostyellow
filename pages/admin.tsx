// import styles from '../app/page.module.css';
import Link from "next/link";

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

        <div>
          <Link href="/">Back to homepage</Link>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
