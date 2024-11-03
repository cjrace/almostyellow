import { Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Uno", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const unoPage = () => {
  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Uno</h1>
      <p>Under construction...</p>
    </div>
  );
};

export default unoPage;
