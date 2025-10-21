import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export const metadata: Metadata = {
  title: "About | React Starter",
  description:
    "Learn more about the React Starter application and its developer.",
};

const developer = {
  name: "Alex Doe",
  role: "Full-Stack Developer",
  bio: "Alex is a passionate developer with a love for creating beautiful and functional web applications. With expertise in React, Next.js, and modern web technologies, Alex is dedicated to building high-quality software that solves real-world problems.",
  avatar: PlaceHolderImages.find((p) => p.id === "developer-avatar"),
};

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline">
          About React Starter
        </h1>
        <p className="mt-4 text-lg text-foreground/80">
          This application serves as a launchpad for building robust and
          scalable React projects.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/80 space-y-4 flex-1">
            <p>
              To provide developers with a clean, well-structured, and
              feature-rich starter kit that accelerates the development process.
            </p>
            <p>
              We believe in the power of good design, clean code, and a great
              developer experience. This starter includes everything you need to
              get up and running quickly, without sacrificing quality or
              flexibility.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Meet the Developer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center flex-1 justify-center pt-6">
            {developer.avatar && (
              <Image
                src={developer.avatar.imageUrl}
                alt="Developer Avatar"
                width={128}
                height={128}
                className="rounded-full mb-4"
                data-ai-hint={developer.avatar.imageHint}
              />
            )}
            <h3 className="text-xl font-semibold">{developer.name}</h3>
            <p className="text-primary">{developer.role}</p>
            <p className="mt-2 text-sm text-foreground/70">{developer.bio}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
