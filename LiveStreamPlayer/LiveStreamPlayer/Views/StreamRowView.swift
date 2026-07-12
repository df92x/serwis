import SwiftUI

struct StreamRowView: View {
    let stream: StreamItem
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(stream.isLive ? Color.red.opacity(0.2) : Color.blue.opacity(0.2))
                    .frame(width: 36, height: 36)

                Image(systemName: stream.isLive ? "dot.radiowaves.left.and.right" : "play.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(stream.isLive ? .red : .blue)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(stream.title)
                    .font(.headline)
                    .lineLimit(1)

                Text(stream.displayURL)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if stream.isLive {
                Text("LIVE")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.15))
                    .foregroundStyle(.red)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
        .listRowBackground(isSelected ? Color.accentColor.opacity(0.12) : Color.clear)
    }
}
