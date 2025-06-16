"use client";

import { 
  Download,
  ExternalLink,
  Globe, 
  Package,
  Plus,
  Save, 
  Settings, 
  Star,
  Trash2,
  User 
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface CustomLink {
  title: string;
  url: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations('Profile');
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    website: "",
    links: [] as CustomLink[],
  });

  const { data: userProfile, isLoading } = api.users.getProfile.useQuery(
    undefined,
    { 
      enabled: !!session?.user?.id,
    }
  );

  const updateProfileMutation = api.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t('profile_updated'));
      setIsEditing(false);
    },
    onError: () => {
      toast.error(t('update_error'));
    },
  });

  useEffect(() => {
    if (userProfile) {
      const parsedLinks = userProfile.links ? JSON.parse(userProfile.links) : [];
      setFormData({
        name: userProfile.name || "",
        bio: userProfile.bio || "",
        website: userProfile.website || "",
        links: parsedLinks,
      });
    }
  }, [userProfile]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t('login_required')}</CardTitle>
            <CardDescription>{t('login_required_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth/signin")} className="w-full">
              {t('login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    const dataToSend = {
      ...formData,
      links: JSON.stringify(formData.links),
    };
    updateProfileMutation.mutate(dataToSend);
  };

  const handleCancel = () => {
    if (userProfile) {
      const parsedLinks = userProfile.links ? JSON.parse(userProfile.links) : [];
      setFormData({
        name: userProfile.name || "",
        bio: userProfile.bio || "",
        website: userProfile.website || "",
        links: parsedLinks,
      });
    }
    setIsEditing(false);
  };

  const addLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { title: "", url: "" }]
    });
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...formData.links];
    if (newLinks[index]) {
      newLinks[index] = { ...newLinks[index], [field]: value };
      setFormData({ ...formData, links: newLinks });
    }
  };

  const removeLink = (index: number) => {
    const newLinks = formData.links.filter((_, i) => i !== index);
    setFormData({ ...formData, links: newLinks });
  };

  const userLinks = userProfile?.links ? JSON.parse(userProfile.links) : [];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">{t('profile_tab')}</TabsTrigger>
            <TabsTrigger value="stats">{t('stats_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('profile_info')}</CardTitle>
                    <CardDescription>{t('profile_info_description')}</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('edit')}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleCancel} variant="outline">
                        {t('cancel')}
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        disabled={updateProfileMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {t('save')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={session.user.image || undefined} alt={session.user.name || ""} />
                    <AvatarFallback className="text-lg">
                      {session.user.name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">
                      {session.user.name || t('anonymous')}
                    </h3>
                    <p className="text-muted-foreground text-sm">{session.user.email}</p>
                    {session.user.telegramUsername && (
                      <p className="text-blue-600 text-sm">@{session.user.telegramUsername}</p>
                    )}
                    {userProfile?.isVerified && (
                      <Badge variant="secondary">{t('verified')}</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">{t('display_name')}</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('display_name_placeholder')}
                        />
                      ) : (
                        <p className="mt-1 text-muted-foreground text-sm">
                          {userProfile?.name || t('not_specified')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="website">{t('website')}</Label>
                      {isEditing ? (
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      ) : userProfile?.website ? (
                        <a 
                          href={userProfile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-1 block text-blue-600 text-sm hover:underline"
                        >
                          {userProfile.website}
                        </a>
                      ) : (
                        <p className="mt-1 text-muted-foreground text-sm">{t('not_specified')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">{t('bio')}</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder={t('bio_placeholder')}
                        rows={4}
                      />
                    ) : (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {userProfile?.bio || t('not_specified')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>{t('custom_links')}</Label>
                    {isEditing ? (
                      <div className="mt-2 space-y-3">
                        {formData.links.map((link, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={t('link_title_placeholder')}
                              value={link.title}
                              onChange={(e) => updateLink(index, 'title', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="https://example.com"
                              type="url"
                              value={link.url}
                              onChange={(e) => updateLink(index, 'url', e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLink(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addLink}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t('add_link')}
                        </Button>
                      </div>
                    ) : userLinks.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {userLinks.map((link: CustomLink, index: number) => (
                          <Button key={index} variant="outline" size="sm" asChild>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {link.title}
                            </a>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground text-sm">{t('not_specified')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">{t('total_plugins')}</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{userProfile?.stats?.totalPlugins || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">{t('total_downloads')}</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{userProfile?.stats?.totalDownloads || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">{t('average_rating')}</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {userProfile?.stats?.averageRating?.toFixed(1) || "0.0"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}