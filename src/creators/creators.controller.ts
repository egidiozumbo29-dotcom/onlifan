import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
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
