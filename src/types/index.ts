export interface Project {
  title: string;
  description: string;
  tags: string[];
  demoUrl?: string;
  codeUrl?: string;
  featured?: boolean;
  /** Short label above the featured card's title. */
  eyebrow?: string;
  fillColor?: string;
  accentColor?: string;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string;
  highlights: string[];
  current?: boolean;
  accentColor?: string;
  logo?: 'goldman' | 'megaplex';
}

export interface SiteMetadata {
  title: string;
  description: string;
  author: string;
  siteUrl: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

export interface NavLink {
  label: string;
  href: string;
}
