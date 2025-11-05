import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Video, 
  Share2, 
  Phone, 
  Building2, 
  Scale, 
  Headphones,
  Sparkles,
  ArrowRight
} from "lucide-react";

const services = [
  {
    id: "ai-agents-247",
    name: "AI Agents 247",
    description: "24/7 AI-powered agents that handle customer inquiries, support tickets, and business operations around the clock.",
    icon: Bot,
    features: ["Round-the-clock availability", "Multi-language support", "Custom training"],
    status: "active",
    category: "Automation"
  },
  {
    id: "ai-receptionist",
    name: "AI Receptionist",
    description: "Intelligent virtual receptionist that manages calls, schedules appointments, and provides information to callers professionally.",
    icon: Headphones,
    features: ["Call routing", "Appointment scheduling", "Information delivery"],
    status: "active",
    category: "Communication"
  },
  {
    id: "ai-cold-calling",
    name: "AI Cold Calling",
    description: "Automated cold calling system that reaches out to prospects, qualifies leads, and books meetings with potential customers.",
    icon: Phone,
    features: ["Lead qualification", "Meeting scheduling", "Follow-up automation"],
    status: "active",
    category: "Sales"
  },
  {
    id: "ai-viral-video-factory",
    name: "AI Viral Video Factory 247",
    description: "Automated video creation platform that generates engaging, platform-optimized content for social media at scale.",
    icon: Video,
    features: ["8-scene generation", "Platform optimization", "Bulk production"],
    status: "active",
    category: "Content"
  },
  {
    id: "autoposter-247",
    name: "AutoPoster 247",
    description: "Automated social media posting system that schedules and publishes content across multiple platforms continuously.",
    icon: Share2,
    features: ["Multi-platform posting", "Schedule optimization", "Performance tracking"],
    status: "active",
    category: "Marketing"
  },
  {
    id: "ai-realtors-247",
    name: "AI Realtors 247",
    description: "Real estate automation suite that handles property inquiries, schedules viewings, and provides detailed information to potential buyers.",
    icon: Building2,
    features: ["Property showcases", "Viewing scheduling", "Lead nurturing"],
    status: "active",
    category: "Real Estate"
  },
  {
    id: "ai-lawyers-247",
    name: "AI Lawyers 247",
    description: "Legal automation platform that provides case information, schedules consultations, and handles basic legal inquiries.",
    icon: Scale,
    features: ["Case management", "Consultation booking", "Document assistance"],
    status: "active",
    category: "Legal"
  }
];

export default function Services() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-accent" />
            <h1 className="text-3xl font-bold">AI Services 247</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Comprehensive AI-powered solutions that work around the clock to automate and enhance your business operations
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Services</p>
                  <p className="text-2xl font-bold">{services.length}</p>
                </div>
                <Bot className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{new Set(services.map(s => s.category)).size}</p>
                </div>
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold">24/7</p>
                </div>
                <Phone className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.id} className="shadow-card hover:shadow-lg transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <Badge variant="secondary">{service.category}</Badge>
                  </div>
                  <CardTitle className="mt-4">{service.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Features:</p>
                    <ul className="space-y-1">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full group-hover:shadow-md transition-shadow" variant="outline">
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Ready to automate your business?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get started with our AI-powered services and transform the way you work. 
                All services run 24/7 with minimal setup required.
              </p>
              <div className="flex gap-4 justify-center pt-2">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline">
                  Contact Sales
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
