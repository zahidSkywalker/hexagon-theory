import React from "react";
import Link from "next/link";
import { Hexagon, Lightbulb, Github, Twitter, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-hexagon-border bg-hexagon-darker">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="relative">
                <Hexagon className="h-7 w-7 text-primary-500" />
                <Lightbulb className="h-3 w-3 text-primary-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                HexaGon Theory
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              A global crowdsourced intelligence platform for development ideas.
              Building a better future, together.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/ideas" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                  Browse Ideas
                </Link>
              </li>
              <li>
                <Link href="/ideas/new" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                  Submit an Idea
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                  Join the Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Categories
            </h3>
            <ul className="space-y-3">
              {["Infrastructure", "Health", "Education", "Technology", "Economy", "Environment"].map(
                (cat) => (
                  <li key={cat}>
                    <Link href={`/ideas?category=${cat}`} className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                      {cat}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Connect
            </h3>
            <div className="flex gap-3 mb-4">
              <a
                href="#"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-gray-400">
              Contact us at{" "}
              <a href="mailto:hello@hexagontheory.com" className="text-primary-400 hover:text-primary-300 transition-colors">
                hello@hexagontheory.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-hexagon-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} HexaGon Theory. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
