import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var streamStore: StreamStore
    @StateObject private var playerViewModel = PlayerViewModel()
    @State private var showAddSheet = false
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            sidebar
        } detail: {
            playerDetail
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showAddSheet) {
            AddStreamSheet()
        }
        .onChange(of: streamStore.selectedStream) { _, stream in
            guard let stream else {
                playerViewModel.stop()
                return
            }
            playerViewModel.load(stream: stream)
        }
        .onAppear {
            if let stream = streamStore.selectedStream {
                playerViewModel.load(stream: stream)
            }
        }
    }

    private var sidebar: some View {
        List(selection: Binding(
            get: { streamStore.selectedStream },
            set: { stream in
                if let stream { streamStore.select(stream) }
            }
        )) {
            Section("Strumienie") {
                if streamStore.streams.isEmpty {
                    ContentUnavailableView(
                        "Brak strumieni",
                        systemImage: "play.tv",
                        description: Text("Dodaj adres .m3u8 lub zaimportuj plik playlisty.")
                    )
                } else {
                    ForEach(streamStore.streams) { stream in
                        StreamRowView(stream: stream, isSelected: streamStore.selectedStream?.id == stream.id)
                            .tag(stream as StreamItem?)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    streamStore.removeStream(stream)
                                } label: {
                                    Label("Usuń", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .navigationTitle("Live Stream")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showAddSheet = true
                } label: {
                    Label("Dodaj", systemImage: "plus")
                }
            }
        }
    }

    @ViewBuilder
    private var playerDetail: some View {
        if let stream = streamStore.selectedStream {
            VStack(spacing: 0) {
                ZStack {
                    Color.black

                    if let player = playerViewModel.player {
                        VideoPlayerView(player: player)
                            .ignoresSafeArea()
                    }

                    if playerViewModel.hasError || playerViewModel.statusMessage != nil {
                        VStack(spacing: 12) {
                            if playerViewModel.hasError {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.largeTitle)
                                    .foregroundStyle(.yellow)
                            } else {
                                ProgressView()
                                    .controlSize(.large)
                            }

                            Text(playerViewModel.statusMessage ?? "Ładowanie…")
                                .font(.subheadline)
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal)
                        }
                        .padding(24)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                .aspectRatio(16 / 9, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .background(Color.black)

                streamInfoBar(for: stream)
            }
            .navigationTitle(stream.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Button {
                        playerViewModel.togglePlayback()
                    } label: {
                        Label(
                            playerViewModel.isPlaying ? "Pauza" : "Odtwórz",
                            systemImage: playerViewModel.isPlaying ? "pause.fill" : "play.fill"
                        )
                    }

                    Spacer()

                    if stream.isLive {
                        Label("Na żywo", systemImage: "dot.radiowaves.left.and.right")
                            .foregroundStyle(.red)
                    }
                }
            }
        } else {
            ContentUnavailableView(
                "Wybierz strumień",
                systemImage: "play.rectangle.on.rectangle",
                description: Text("Dodaj plik .m3u8 lub adres HLS, aby rozpocząć odtwarzanie.")
            )
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Label("Dodaj strumień", systemImage: "plus")
                    }
                }
            }
        }
    }

    private func streamInfoBar(for stream: StreamItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(stream.title)
                    .font(.title3.weight(.semibold))

                if stream.isLive {
                    Text("LIVE")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.15))
                        .foregroundStyle(.red)
                        .clipShape(Capsule())
                }
            }

            Text(stream.displayURL)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(white: 0.08))
    }
}

#Preview {
    ContentView()
        .environmentObject(StreamStore())
}
