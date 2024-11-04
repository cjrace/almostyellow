import Checklist from "@/components/checklist";
import { Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const ChopinLiszt: React.FC = () => {
  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Our Chopin Liszt</h1>
      <Checklist />
    </div>
  );
};

export default ChopinLiszt;
