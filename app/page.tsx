import { ParticipantManager } from "@/components/participant-manager"
import { CourtDisplay } from "@/components/court-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, MapPin } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">羽球分隊管理系統</h1>
          <p className="text-muted-foreground text-lg">羽球分隊系統</p>
        </div>

        <Tabs defaultValue="participants" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              參與者管理
            </TabsTrigger>
            <TabsTrigger value="courts" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              羽球場管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>參與者管理</CardTitle>
                <CardDescription>添加參與者資訊，包括姓名和能力等級（1-10級）</CardDescription>
              </CardHeader>
              <CardContent>
                <ParticipantManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courts">
            <Card>
              <CardHeader>
                <CardTitle>羽球場管理</CardTitle>
                <CardDescription>設置場地數量並管理每個場地的比賽</CardDescription>
              </CardHeader>
              <CardContent>
                <CourtDisplay />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
