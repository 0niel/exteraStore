"use client";

import { Code, Download, ExternalLink, Heart, Shield, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { cn, formatNumber } from "~/lib/utils";

interface Plugin {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  version: string;
  author: string;
  category: string;
  tags: string | null;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  price: number;
  featured: boolean;
  verified: boolean;
  screenshots: string | null;
  createdAt: Date;
}

interface PluginCardProps {
  plugin: Plugin;
  className?: string;
  showAuthor?: boolean;
  compact?: boolean;
}

export function PluginCard({ 
  plugin, 
  className, 
  showAuthor = true, 
  compact = false 
}: PluginCardProps) {
  const t = useTranslations('PluginCard');
  const tags = plugin.tags ? JSON.parse(plugin.tags) as string[] : [];

  return (
    <Card className={cn(
      "group hover:-translate-y-1 border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/20",
      plugin.featured && "border-primary/30",
      className
    )}>
      {plugin.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            ⭐ {t('featured')}
          </Badge>
        </div>
      )}

      <CardHeader className={cn("p-6", compact && "p-4")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg transition-colors group-hover:text-primary">
                <Link href={`/plugins/${plugin.slug}`}>
                  {plugin.name}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm">v{plugin.version}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 dark:bg-yellow-900/20">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-sm">{plugin.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("px-6 pb-4", compact && "px-4 pb-3")}>
        <div className="space-y-4">
          {showAuthor && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Avatar className="h-5 w-5">
                <AvatarImage src={`https://t.me/i/userpic/320/${plugin.author.toLowerCase().replace(/[^a-z0-9]/g, '')}.jpg`} />
                <AvatarFallback className="text-xs">
                  {plugin.author.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{plugin.author}</span>
              {plugin.verified && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs">{t('verified')}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-3">
            {plugin.shortDescription || plugin.description}
          </p>

          {tags.length > 0 && !compact && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className={cn("px-6 pt-0 pb-6", compact && "px-4 pb-4")}>
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">{formatNumber(plugin.downloadCount)}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {plugin.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {plugin.price > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  ${plugin.price}
                </Badge>
              )}
              {plugin.price === 0 && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                  {t('free')}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500 transition-colors opacity-60 hover:opacity-100"
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Link href={`/plugins/${plugin.slug}`}>
              {t('details')}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}