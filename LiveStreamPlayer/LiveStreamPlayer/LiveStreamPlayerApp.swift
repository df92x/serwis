import SwiftUI

@main
struct LiveStreamPlayerApp: App {
    @StateObject private var streamStore = StreamStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(streamStore)
        }
    }
}
