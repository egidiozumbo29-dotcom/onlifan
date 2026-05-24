import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobQueue, VideoProcessingJob } from './interfaces/job.interface';

@Processor(JobQueue.VIDEO_PROCESSING)
export class VideoTranscodeProcessor {
  private readonly logger = new Logger(VideoTranscodeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Process('transcode')
  async handleTranscode(job: Job<VideoProcessingJob>) {
    const { mediaId, creatorId, originalKey } = job.data;
    this.logger.log(`Transcoding media ${mediaId}`);

    await this.prisma.media.update({ where: { id: mediaId }, data: { status: 'PROCESSING' } });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `dollyfans-${mediaId}-`));
    const srcPath = path.join(workDir, 'src.bin');
    const outPath = path.join(workDir, 'out.mp4');
    const thumbPath = path.join(workDir, 'thumb.jpg');

    try {
      const buf = await this.storage.getBuffer(originalKey);
      await fs.writeFile(srcPath, buf);

      // Transcode to web-friendly H.264 720p with watermark text
      const watermark = `drawtext=text='dollyfans.com/${creatorId.slice(0, 8)}':x=w-tw-20:y=h-th-20:fontcolor=white@0.4:fontsize=24:box=1:boxcolor=black@0.3:boxborderw=5`;
      await this.runFfmpeg([
        '-y',
        '-i', srcPath,
        '-vf', `scale=-2:720,${watermark}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outPath,
      ]);

      // Thumbnail at 1 second
      await this.runFfmpeg(['-y', '-i', srcPath, '-ss', '00:00:01', '-vframes', '1', '-q:v', '3', thumbPath]);

      const outBuf = await fs.readFile(outPath);
      const thumbBuf = await fs.readFile(thumbPath);

      const processedKey = this.storage.buildProcessedKey(creatorId, mediaId, 'video.mp4');
      const thumbKey = this.storage.buildThumbnailKey(creatorId, mediaId, 'thumb.jpg');

      await this.storage.putBuffer(processedKey, outBuf, 'video/mp4');
      await this.storage.putBuffer(thumbKey, thumbBuf, 'image/jpeg');

      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          status: 'READY',
          processedObjectKey: processedKey,
          thumbnailObjectKey: thumbKey,
        },
      });
      this.logger.log(`Transcoded media ${mediaId}`);
    } catch (err) {
      this.logger.error(`Transcode failed for ${mediaId}: ${(err as Error).message}`);
      await this.prisma.media.update({ where: { id: mediaId }, data: { status: 'FAILED' } });
      throw err;
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';
      const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      });
      proc.on('error', reject);
    });
  }
}
