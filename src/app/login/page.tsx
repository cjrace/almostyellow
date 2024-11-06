import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
} from "@mantine/core";

export default function AuthenticationTitle() {
  return (
    <Container size={420} my={40}>
      <Title ta="center">Want to access the good stuff?</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <TextInput
          label="Email"
          placeholder="e.g. simply@thebest.co.uk"
          required
        />
        <PasswordInput label="Password" placeholder="" required mt="md" />

        <Button fullWidth mt="xl">
          Sign in
        </Button>
      </Paper>
    </Container>
  );
}
