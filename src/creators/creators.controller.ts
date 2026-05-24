import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { CreatorsService } from './creators.service';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  apply(@CurrentUser() user: { id: string }, @Body() dto: ApplyCreatorDto) {
    return this.creatorsService.apply(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.creatorsService.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateCreatorDto) {
    return this.creatorsService.updateMine(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/posts')
  myPosts(@CurrentUser() user: { id: string }) {
    return this.creatorsService.listMyPosts(user.id);
  }

  @Get()
  list() {
    return this.creatorsService.listPublic();
  }

  @Get(':username')
  findByUsername(@Param('username') username: string) {
    return this.creatorsService.findByUsername(username);
  }

  @Get(':username/posts')
  posts(@Param('username') username: string) {
    return this.creatorsService.listPostsByUsername(username);
  }
}
