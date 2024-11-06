import { Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default async function Games() {
  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Our games</h1>

      <ul>
        <li>
          {" "}
          <Anchor href="/games/irishbingo">Irish bingo</Anchor>
        </li>
        <li>
          <Anchor href="/games/uno">Uno</Anchor>
        </li>
        <li>
          {" "}
          <Anchor href="/games">???</Anchor>
        </li>
      </ul>
    </div>
  );
}
