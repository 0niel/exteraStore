"use client";

import { ExternalLink, Github, Globe, Linkedin, Package, Search, Star, Twitter, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function DevelopersPage() {
  const t = useTranslations('Developers');
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data: developersData, isLoading } = api.developers.getDevelopers.useQuery({
    page,
    limit: 12,
    search: searchQuery,
  });

  const filteredDevelopers = developersData?.developers || [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        badge={t('badge')}
        title={t('title')}
        description={t('description')}
        icon={Users}
      />

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="text-center">
                  <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
                  <Skeleton className="mx-auto mb-2 h-6 w-32" />
                  <Skeleton className="mx-auto h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevelopers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                {searchQuery ? t('no_results') : t('no_developers')}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? t('try_different_search') : t('no_developers_description')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDevelopers.map((developer: any) => (
                <Card key={developer.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader className="text-center">
                    <Avatar className="mx-auto mb-4 h-16 w-16">
                      <AvatarImage src={developer.image || undefined} alt={developer.name || ""} />
                      <AvatarFallback className="text-lg">
                        {developer.name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">
                      <Link 
                        href={`/developers/${developer.id}`}
                        className="transition-colors hover:text-primary"
                      >
                        {developer.name || t('anonymous')}
                      </Link>
                    </CardTitle>
                    {developer.isVerified && (
                      <Badge variant="secondary" className="mx-auto w-fit">
                        {t('verified')}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {developer.bio && (
                      <p className="mb-4 line-clamp-3 text-muted-foreground text-sm">
                        {developer.bio}
                      </p>
                    )}
                    
                    <div className="mb-4 flex items-center justify-between text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{developer.pluginCount} {t('plugins')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{developer.averageRating?.toFixed(1) || "0.0"}</span>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      {developer.githubUsername && (
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={`https://github.com/${developer.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {developer.website && (
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={developer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {developer.links && JSON.parse(developer.links).map((link: any, index: number) => (
                        <Button key={index} variant="ghost" size="sm" asChild>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.title}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ))}
                    </div>

                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/developers/${developer.id}`}>
                        {t('view_profile')}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {developersData && developersData.pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  {t('previous')}
                </Button>
                <span className="flex items-center px-4">
                  {t('page')} {page} {t('of')} {developersData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === developersData.pagination.totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}