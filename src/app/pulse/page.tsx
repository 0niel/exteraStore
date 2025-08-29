"use client";

import { Activity, Package, Star, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

function formatTimeAgo(tsSec: number) {
  const diffMs = Date.now() - tsSec * 1000;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}с назад`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}м назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}ч назад`;
  const d = Math.floor(hr / 24);
  return `${d}д назад`;
}

function formatDayLabel(tsSec: number) {
  const d = new Date(tsSec * 1000);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PulsePage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "plugin.created" | "version.released" | "review.added">("all");

  const activeTypes = tab === "all" ? undefined : [tab];
  const { data, isLoading, isFetching } = api.pulse.get.useQuery({ page, limit: 20, types: activeTypes });

  const items = data?.items ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  const groups = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const it of items) {
      const key = formatDayLabel(it.createdAt);
      g[key] = g[key] || [];
      g[key].push(it);
    }
    return g;
  }, [items]);

  const renderIcon = (type: string) => {
    if (type === "plugin.created") return <Package className="h-4 w-4 text-white" />;
    if (type === "version.released") return <Tag className="h-4 w-4 text-white" />;
    return <Star className="h-4 w-4 text-white" />;
  };

  const bubbleClass = (type: string) =>
    type === "plugin.created"
      ? "bg-gradient-to-br from-emerald-500 to-teal-500"
      : type === "version.released"
      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
      : "bg-gradient-to-br from-amber-500 to-orange-500";

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          badge="Активность"
          title="Пульс экстератора"
          description="Живая лента событий: публикации плагинов, релизы версий и отзывы"
          icon={Activity}
        />

        <Card className="mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setPage(1); }}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="all">Все</TabsTrigger>
                  <TabsTrigger value="plugin.created">Плагины</TabsTrigger>
                  <TabsTrigger value="version.released">Релизы</TabsTrigger>
                  <TabsTrigger value="review.added">Отзывы</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="text-muted-foreground text-xs sm:text-sm">
                {isLoading ? "Загрузка..." : `Показано ${items.length} событий`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {isLoading ? (
          <div className="relative">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative pl-14">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                <div className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-accent shadow-sm" />
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="🫧" title="Пока пусто" description="Новые события появятся здесь. Загляните позже." />
        ) : (
          <div className="relative">
            {Object.entries(groups).map(([day, list]) => (
              <div key={day} className="mb-8">
                <div className="mb-3 pl-2 text-muted-foreground text-xs sm:text-sm">{day}</div>
                {list.map((it: any, idx: number) => (
                  <div key={it.id} className="relative pl-14">
                    <div className="absolute left-6 top-10 bottom-0 w-px bg-border" />
                    <div className={`absolute left-2 top-1 grid h-9 w-9 place-items-center rounded-full ${bubbleClass(it.type)} shadow ring-2 ring-background`}>
                      {renderIcon(it.type)}
                    </div>
                    <Card className="mb-4 overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <CardTitle className="text-base">
                          {it.type === "plugin.created" && (
                            <span>Новый плагин: {it.plugin?.name}</span>
                          )}
                          {it.type === "version.released" && (
                            <span>Релиз {it.version?.version} для {it.plugin?.name}</span>
                          )}
                          {it.type === "review.added" && (
                            <span>Отзыв к {it.plugin?.name}</span>
                          )}
                        </CardTitle>
                        <span className="text-muted-foreground text-xs">{formatTimeAgo(it.createdAt)}</span>
                      </CardHeader>
                      <Separator />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={it.actor?.image ?? undefined} />
                            <AvatarFallback>{(it.actor?.name ?? "??").slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 text-sm">
                              <span className="font-medium">{it.actor?.name ?? "Unknown"}</span>{" "}
                              {it.type === "plugin.created" && (
                                <>
                                  опубликовал плагин{" "}
                                  <Link className="underline" href={`/plugins/${it.plugin?.slug}`}>{it.plugin?.name}</Link>
                                </>
                              )}
                              {it.type === "version.released" && (
                                <>
                                  выпустил версию {it.version?.version} для{" "}
                                  <Link className="underline" href={`/plugins/${it.plugin?.slug}`}>{it.plugin?.name}</Link>
                                </>
                              )}
                              {it.type === "review.added" && (
                                <>
                                  оставил отзыв для{" "}
                                  <Link className="underline" href={`/plugins/${it.plugin?.slug}`}>{it.plugin?.name}</Link>
                                  {typeof it.rating === "number" && (
                                    <Badge className="ml-2" variant="secondary">{it.rating}★</Badge>
                                  )}
                                </>
                              )}
                            </div>
                            {it.type === "review.added" && it.review?.comment && (
                              <div className="text-muted-foreground text-sm">{it.review?.comment}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isFetching}>← Назад</Button>
            <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isFetching}>Вперед →</Button>
          </div>
        )}
      </div>
    </div>
  );
}


