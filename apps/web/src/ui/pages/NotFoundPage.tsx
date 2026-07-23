import {
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui";
import { Link } from "../routing/router";

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
          <CardDescription>This route does not exist yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className={buttonVariants({ variant: "secondary" })}>
            Go home
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
