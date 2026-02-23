export const typographyRoles = {
  display: "type-display",
  heading: "type-heading",
  subhead: "type-subhead",
  body: "type-body",
  label: "type-label",
  tag: "type-tag",
  metric: "type-metric",
  metricUnit: "type-metric-unit",
  data: "type-data",
  code: "type-code",
  timestamp: "type-timestamp",
  nav: "type-nav",
  navActive: "type-nav-active",
  link: "type-link",
  breadcrumb: "type-breadcrumb",
} as const;

export type TypographyRole = keyof typeof typographyRoles;

export const typographyRole = (role: TypographyRole): string => typographyRoles[role];
