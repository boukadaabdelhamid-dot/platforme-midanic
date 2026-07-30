import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, Download, Users, Globe, TrendingUp } from 'lucide-react';
import { useGetPublicStats, useGetFeaturedProducts, useListBlogPosts, useSubscribeNewsletter } from '@workspace/api-client-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Home() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const { data: stats } = useGetPublicStats();
  const { data: featuredProducts } = useGetFeaturedProducts();
  const { data: blogData } = useListBlogPosts({ page: 1, limit: 3 });
  const subscribeNewsletter = useSubscribeNewsletter();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subscribeNewsletter.mutate(
      { data: { email } },
      {
        onSuccess: () => {
          toast.success(t('home.newsletter_success'));
          setEmail('');
        },
        onError: () => {
          toast.error(t('common.error'));
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight" data-testid="text-hero-title">
                {t('home.hero_title')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed" data-testid="text-hero-subtitle">
                {t('home.hero_subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" data-testid="link-cta-products">
                  <Button size="lg" className="gap-2">
                    {t('home.cta_primary')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/demo" data-testid="link-cta-demo">
                  <Button size="lg" variant="outline">
                    {t('home.cta_secondary')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-lg overflow-hidden border border-border shadow-2xl">
                <img
                  src="/hero-dashboard.jpg"
                  alt="Midanic Dashboard"
                  className="w-full h-full object-cover"
                  data-testid="img-hero"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" data-testid="text-stats-title">
              {t('home.stats_title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              <div className="text-center" data-testid="stat-products">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stats.totalProducts}</div>
                <div className="text-sm text-muted-foreground mt-1">{t('home.stats_products')}</div>
              </div>
              <div className="text-center" data-testid="stat-clients">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stats.totalClients}</div>
                <div className="text-sm text-muted-foreground mt-1">{t('home.stats_clients')}</div>
              </div>
              <div className="text-center" data-testid="stat-downloads">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stats.totalDownloads.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-1">{t('home.stats_downloads')}</div>
              </div>
              <div className="text-center" data-testid="stat-countries">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stats.totalCountries}</div>
                <div className="text-sm text-muted-foreground mt-1">{t('home.stats_countries')}</div>
              </div>
              {stats.yearsInBusiness && (
                <div className="text-center col-span-2 md:col-span-1" data-testid="stat-years">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stats.yearsInBusiness}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('home.stats_years')}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl md:text-3xl font-bold" data-testid="text-featured-title">
                {t('home.featured_products')}
              </h2>
              <Link href="/products" data-testid="link-all-products">
                <Button variant="ghost" className="gap-2">
                  {t('home.all_products')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} data-testid={`card-product-${product.id}`}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="aspect-video bg-muted rounded-md mb-4 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Download className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.shortDescription || product.description}
                      </p>
                      <div className="mt-4 text-xs text-muted-foreground">
                        {product.category}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Preview */}
      {blogData && blogData.posts.length > 0 && (
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl md:text-3xl font-bold" data-testid="text-blog-title">
                {t('home.blog_title')}
              </h2>
              <Link href="/blog" data-testid="link-blog">
                <Button variant="ghost" className="gap-2">
                  {t('home.view_blog')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogData.posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} data-testid={`card-blog-${post.id}`}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      {post.coverImageUrl && (
                        <div className="aspect-video bg-muted rounded-md mb-4 overflow-hidden">
                          <img
                            src={post.coverImageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {post.excerpt}
                      </p>
                      {post.authorName && (
                        <div className="mt-4 text-xs text-muted-foreground">
                          {t('blog.by')} {post.authorName}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-newsletter-title">
            {t('home.newsletter_title')}
          </h2>
          <p className="text-lg opacity-90 mb-8" data-testid="text-newsletter-subtitle">
            {t('home.newsletter_subtitle')}
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-3 max-w-md mx-auto" data-testid="form-newsletter">
            <Input
              type="email"
              placeholder={t('home.newsletter_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-primary-foreground text-foreground"
              data-testid="input-newsletter-email"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={subscribeNewsletter.isPending}
              data-testid="button-newsletter-submit"
            >
              {t('home.newsletter_button')}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
