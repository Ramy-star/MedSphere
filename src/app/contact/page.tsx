import type { Metadata } from "next";
import { Mail, Phone, Share2 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact | React Starter",
  description: "Get in touch with us.",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline">
          Contact Us
        </h1>
        <p className="mt-4 text-lg text-foreground/80">
          Have a question or want to work together? Drop us a line.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Contact Information
            </h2>
            <div className="space-y-4 text-foreground/80">
              <div className="flex items-center gap-4">
                <Mail className="w-5 h-5 text-primary" />
                <span>hello@reactstarter.com</span>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-primary" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-4">
                <Share2 className="w-5 h-5 text-primary" />
                <span>Follow us on social media</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Send a Message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
