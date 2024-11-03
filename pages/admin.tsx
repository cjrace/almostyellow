import { Breadcrumbs, Anchor } from "@mantine/core";

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
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Welcome to our admin page</h1>

      <Anchor href="/admin/chopinliszt">Chopin Liszt</Anchor>
      <Anchor href="/admin">???</Anchor>
      <Anchor href="/admin">???</Anchor>
    </div>
  );
};

export default AdminPage;
